# ------------------------------------------------------------
# DATA — Latest Amazon Linux 2023 AMI
# ------------------------------------------------------------
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# ------------------------------------------------------------
# JENKINS LAUNCH TEMPLATE
# Userdata mounts EFS and installs Jenkins
# ------------------------------------------------------------
resource "aws_launch_template" "jenkins" {
  name          = "${var.project_name}-jenkins-lt"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  iam_instance_profile {
    name = var.jenkins_instance_profile_name
  }

  vpc_security_group_ids = [var.jenkins_sg_id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/userdata/jenkins-userdata.sh", {
    efs_dns_name = var.efs_dns_name
    aws_region   = "ap-south-1"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-jenkins"
      Role = "jenkins"
    }
  }

  tags = {
    Name = "${var.project_name}-jenkins-lt"
  }
}

# ------------------------------------------------------------
# SONAR LAUNCH TEMPLATE
# ------------------------------------------------------------
resource "aws_launch_template" "sonar" {
  name          = "${var.project_name}-sonar-lt"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  iam_instance_profile {
    name = var.sonar_instance_profile_name
  }

  vpc_security_group_ids = [var.sonar_sg_id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/userdata/sonar-userdata.sh", {
    sonar_db_endpoint   = var.sonar_db_endpoint
    sonar_db_secret_arn = var.sonar_db_secret_arn
    aws_region          = "ap-south-1"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-sonar"
      Role = "sonar"
    }
  }

  tags = {
    Name = "${var.project_name}-sonar-lt"
  }
}

# ------------------------------------------------------------
# CI/CD ALB (public, 2-AZ)
# ------------------------------------------------------------
resource "aws_lb" "cicd" {
  name               = "${var.project_name}-cicd-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.cicd_alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name = "${var.project_name}-cicd-alb"
  }
}

# ------------------------------------------------------------
# TARGET GROUPS — Jenkins (8080) + Sonar (9000)
# ------------------------------------------------------------
resource "aws_lb_target_group" "jenkins" {
  name        = "${var.project_name}-jenkins-tg"
  port        = 8080
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/login"
    port                = "8080"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200,403"
  }

  tags = {
    Name = "${var.project_name}-jenkins-tg"
  }
}

resource "aws_lb_target_group" "sonar" {
  name        = "${var.project_name}-sonar-tg"
  port        = 9000
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/api/system/status"
    port                = "9000"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-sonar-tg"
  }
}

# ------------------------------------------------------------
# LISTENERS
# port 8080 -> Jenkins
# port 9000 -> Sonar
# port 80 -> default 404 (kept for compliance / port scanning noise reduction)
# ------------------------------------------------------------
resource "aws_lb_listener" "jenkins" {
  load_balancer_arn = aws_lb.cicd.arn
  port              = 8080
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.jenkins.arn
  }

  tags = {
    Name = "${var.project_name}-jenkins-listener"
  }
}

resource "aws_lb_listener" "sonar" {
  load_balancer_arn = aws_lb.cicd.arn
  port              = 9000
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sonar.arn
  }

  tags = {
    Name = "${var.project_name}-sonar-listener"
  }
}

resource "aws_lb_listener" "default_80" {
  load_balancer_arn = aws_lb.cicd.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found - use port 8080 for Jenkins or 9000 for Sonar"
      status_code  = "404"
    }
  }

  tags = {
    Name = "${var.project_name}-default-listener"
  }
}

# ------------------------------------------------------------
# ASGs — Jenkins + Sonar
# desired=0, max=1 — scale up on demand to save cost
# ------------------------------------------------------------
resource "aws_autoscaling_group" "jenkins" {
  name                = "${var.project_name}-jenkins-asg"
  vpc_zone_identifier = [var.cicd_subnet_id]

  desired_capacity = 0
  min_size         = 0
  max_size         = 1

  health_check_type         = "EC2"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.jenkins.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.jenkins.arn]

  tag {
    key                 = "Name"
    value               = "${var.project_name}-jenkins-asg"
    propagate_at_launch = false
  }

  tag {
    key                 = "Project"
    value               = var.project_name
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_group" "sonar" {
  name                = "${var.project_name}-sonar-asg"
  vpc_zone_identifier = [var.cicd_subnet_id]

  desired_capacity = 0
  min_size         = 0
  max_size         = 1

  health_check_type         = "EC2"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.sonar.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.sonar.arn]

  tag {
    key                 = "Name"
    value               = "${var.project_name}-sonar-asg"
    propagate_at_launch = false
  }

  tag {
    key                 = "Project"
    value               = var.project_name
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
